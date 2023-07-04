import { Component, ContentChild, OnInit } from '@angular/core';
import { StarRatingComponent } from '../star-rating/star-rating.component';
import { ActivatedRoute } from '@angular/router';
import { MovieService } from '../services/movie-service';
import { Observable } from 'rxjs';
import { number } from 'joi';
import { AuthService } from '@auth0/auth0-angular';
import { Comment } from '../interfaces/comment'
import { ApiService } from '../services/api.service';
import { Movie } from '../interfaces/movie';

@Component({
  selector: 'app-discussion',
  templateUrl: './discussion.component.html',
  styleUrls: ['./discussion.component.css']
})
export class DiscussionComponent {
  public title = "watchers";

  // initial value for start rating
  public rating: number = 0;

  // array to store all comments on the movie
  public comments: Comment[] = [];

  // default selected tab is summary
  public selectedTab = 'summary';

  public thisUser: any;
  //movie data as an observable
  public movie$: Observable<Movie | undefined>;
  public posts: any[] = [];
  constructor(
    private route: ActivatedRoute, 
    private movieService: MovieService, 
    public auth: AuthService, 
    public apiService: ApiService) {  
    // gets movie name from the route
    let movieName = this.route.snapshot.paramMap.get('name');
    this.movie$ = movieService.getMovie(movieName ? movieName : "");

    // checks if user is logged in and saves user name if they are
    auth.user$.subscribe((data) => {
      if (data && data.email) {
        apiService.getUser(data.email).subscribe(user => {
          this.thisUser = user;
        });
        this.apiService.getAllUsers().subscribe(response => {
          const users = Object.values(response);
          users.forEach(user => {
            this.apiService.getUserComments(user['userId']).subscribe(posts => {
              let userPosts = Object.values(posts)[0].filter((post:any) => post.referencedMovieId && post.referencedMovieId!=="" && post.postBody);
              console.log(userPosts)
              userPosts.forEach((post:any)=> {
                let postTitle = '';
                let postBody = ''
                if(post.postBody.indexOf("~")!=0) {
                  postTitle = post.postBody.split("~")[0];
                  postBody = post.postBody.split("~")[1];
                }
                console.log(post.postBody)
                this.comments.push({author: user.username, topic: postTitle, content: postBody, date: post.postTime, likes: 0, movie: post.referencedMovieId});
              });
            });
          });
        });
      }
    });
  }

  // switch tab
  public selectTab(tabName: string) {
    this.selectedTab = tabName;
  }

  // sort comments based on number of likes for 'Hot' tab
  public sortByLikes(movieName:string) {
    if(movieName!=='') {
      this.comments = this.comments.filter(c => c.movie==movieName);
    }
    const sorted = [...this.comments].sort((a, b) => b.likes-a.likes);
    return sorted;
  }

  // sort comments based on when they were written for 'New' tab
  public sortByDate(movieName:string) {
    console.log('here')
    if(movieName!=='') {
      this.comments = this.comments.filter(c => c.movie==movieName);
    }
    const sorted = [...this.comments].sort(function(a, b){
      if(new Date(a.date) > new Date(b.date)) {
        return -1;
      }
      else {
        return 1
      }
    });
    return sorted;
  }

  // get a shorter string for the date
  public getFriendlyDate(date: any) {
    try {
      let newdate = new Date(date);
      return newdate.getMonth().toString() + '/' + newdate.getDay().toString() + '/' + newdate.getFullYear().toString()
    } catch {
      let newdate = new Date(date);
      return newdate.getMonth().toString() + '/' + newdate.getDay().toString() + '/' + newdate.getFullYear().toString()
    }
  }

  // create a new comment
  public addComment(topic: string, comment: string, movie: string) {
    // create comment object to save. User is anonymous by default unless logged in
    if(topic.length<100 && comment.length<200) {
      const newComment: Comment = {
        author: this.thisUser.email,
        content: comment,
        topic: topic,
        date: new Date(),
        likes: 0,
        movie: movie
      };

      let postMessage = newComment.topic +"~"+newComment.content;
      // add the new comment to the list of comments
      this.comments.push(newComment);
      console.log(this.comments)
      this.apiService.addPostToUser(this.thisUser.userId, postMessage, movie).subscribe(response => {
        if(response) {
          console.log(response)
          this.selectedTab = "new";
        }
      });
    }
  }

  // add to comment likes when someone likes a comment
  public likeComment(comment: Comment) {
    // NOT SAVING TO DATABASE YET
    const commentIndex = this.comments.indexOf(comment);
    // replaces old comment in additional array
    this.comments[commentIndex].likes +=1;
    console.log(this.comments)
  }

  public addToFavorites(movie: string) {
    if(this.thisUser && this.thisUser.email) {
      const favorites = this.thisUser.favorites;
      let newFavorites = "";
      if(favorites && favorites.indexOf(movie)!==-1) {
        if(favorites.indexOf(","+movie)!==-1) {
          newFavorites = favorites.replace(","+movie, "");
        }
        else if(favorites.indexOf(movie+",")!==-1){
          newFavorites = favorites.replace(movie+",", "");
        }
        else {
          newFavorites = "";
        }
      }
      else if(favorites && favorites.length>0){
        newFavorites = favorites + ","+movie;
      }
      else {
        newFavorites = movie;
      }

      this.apiService.addFavorites(this.thisUser.email, newFavorites).subscribe(user => {
        this.thisUser = user;
      });
    }
  }

  public addToWantToWatch(movie: string) {
    if(this.thisUser && this.thisUser.email) {
      const wantToWatch = this.thisUser.wantToWatch;
      let newWantToWatch = "";
      if(wantToWatch && wantToWatch.indexOf(movie)!==-1) {
        if(wantToWatch.indexOf(","+movie)!==-1) {
          newWantToWatch = wantToWatch.replace(","+movie, "");
        }
        else if(wantToWatch.indexOf(movie+",")!==-1){
          newWantToWatch = wantToWatch.replace(movie+",", "");
        }
        else {
          newWantToWatch = "";
        }
      }
      else if(wantToWatch && wantToWatch.length>0){
        newWantToWatch = wantToWatch + ","+movie;
      }
      else {
        newWantToWatch = movie;
      }

      this.apiService.addWantToWatch(this.thisUser.email, newWantToWatch).subscribe(user => {
        this.thisUser = user;
      });
    }
  }

}
